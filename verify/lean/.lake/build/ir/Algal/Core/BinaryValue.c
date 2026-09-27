// Lean compiler output
// Module: Algal.Core.BinaryValue
// Imports: public import Init public meta import Init public import Algal.Core.Binary64 public import Init.Data.Dyadic public import Init.Data.Float.Model.Unpacked.Pack.Lemmas public import Init.Omega
#include <lean/lean.h>
#if defined(__clang__)
#pragma clang diagnostic ignored "-Wunused-parameter"
#pragma clang diagnostic ignored "-Wunused-label"
#elif defined(__GNUC__) && !defined(__CLANG__)
#pragma GCC diagnostic ignored "-Wunused-parameter"
#pragma GCC diagnostic ignored "-Wunused-label"
#pragma GCC diagnostic ignored "-Wunused-but-set-variable"
#endif
#ifdef __cplusplus
extern "C" {
#endif
lean_object* lean_uint64_to_nat(uint64_t);
lean_object* lean_nat_mod(lean_object*, lean_object*);
lean_object* lean_nat_shiftr(lean_object*, lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Core_Binary64_exponent(uint64_t);
lean_object* lean_nat_to_int(lean_object*);
lean_object* lean_int_sub(lean_object*, lean_object*);
lean_object* lean_int_neg(lean_object*);
lean_object* lean_nat_add(lean_object*, lean_object*);
lean_object* l_Float_Model_UnpackedFloat_Sign_apply(uint8_t, lean_object*);
lean_object* l_Dyadic_ofIntWithPrec(lean_object*, lean_object*);
lean_object* l_Dyadic_ofInt(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_fraction(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_fraction___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_signBit(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_signBit___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_BinaryValue_sign(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_sign___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_coefficient(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_coefficient___boxed(lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Core_BinaryValue_power___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_BinaryValue_power___closed__0;
static lean_once_cell_t lp_algalVerification_Algal_Core_BinaryValue_power___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_BinaryValue_power___closed__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_BinaryValue_power___closed__2_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_BinaryValue_power___closed__2;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_power(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_power___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_exact(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_exact___boxed(lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__0;
static lean_once_cell_t lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__2_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__2;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_unpackedExact(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_BinaryValue_0__Algal_Core_BinaryValue_unpackedExact_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_BinaryValue_0__Algal_Core_BinaryValue_unpackedExact_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_BinaryValue_0__Float_Model_UnpackedFloat_Sign_instNeg_match__1_splitter___redArg(uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_BinaryValue_0__Float_Model_UnpackedFloat_Sign_instNeg_match__1_splitter___redArg___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_BinaryValue_0__Float_Model_UnpackedFloat_Sign_instNeg_match__1_splitter(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_BinaryValue_0__Float_Model_UnpackedFloat_Sign_instNeg_match__1_splitter___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_denote(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_denote___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_fraction(uint64_t v_bits_1_){
_start:
{
lean_object* v___x_2_; lean_object* v___x_3_; lean_object* v___x_4_; 
v___x_2_ = lean_uint64_to_nat(v_bits_1_);
v___x_3_ = lean_cstr_to_nat("4503599627370496");
v___x_4_ = lean_nat_mod(v___x_2_, v___x_3_);
lean_dec(v___x_2_);
return v___x_4_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_fraction___boxed(lean_object* v_bits_5_){
_start:
{
uint64_t v_bits_boxed_6_; lean_object* v_res_7_; 
v_bits_boxed_6_ = lean_unbox_uint64(v_bits_5_);
lean_dec_ref(v_bits_5_);
v_res_7_ = lp_algalVerification_Algal_Core_BinaryValue_fraction(v_bits_boxed_6_);
return v_res_7_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_signBit(uint64_t v_bits_8_){
_start:
{
lean_object* v___x_9_; lean_object* v___x_10_; lean_object* v___x_11_; 
v___x_9_ = lean_uint64_to_nat(v_bits_8_);
v___x_10_ = lean_unsigned_to_nat(63u);
v___x_11_ = lean_nat_shiftr(v___x_9_, v___x_10_);
lean_dec(v___x_9_);
return v___x_11_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_signBit___boxed(lean_object* v_bits_12_){
_start:
{
uint64_t v_bits_boxed_13_; lean_object* v_res_14_; 
v_bits_boxed_13_ = lean_unbox_uint64(v_bits_12_);
lean_dec_ref(v_bits_12_);
v_res_14_ = lp_algalVerification_Algal_Core_BinaryValue_signBit(v_bits_boxed_13_);
return v_res_14_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_BinaryValue_sign(uint64_t v_bits_15_){
_start:
{
lean_object* v___x_16_; lean_object* v___x_17_; uint8_t v___x_18_; 
v___x_16_ = lp_algalVerification_Algal_Core_BinaryValue_signBit(v_bits_15_);
v___x_17_ = lean_unsigned_to_nat(0u);
v___x_18_ = lean_nat_dec_eq(v___x_16_, v___x_17_);
lean_dec(v___x_16_);
if (v___x_18_ == 0)
{
uint8_t v___x_19_; 
v___x_19_ = 0;
return v___x_19_;
}
else
{
uint8_t v___x_20_; 
v___x_20_ = 1;
return v___x_20_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_sign___boxed(lean_object* v_bits_21_){
_start:
{
uint64_t v_bits_boxed_22_; uint8_t v_res_23_; lean_object* v_r_24_; 
v_bits_boxed_22_ = lean_unbox_uint64(v_bits_21_);
lean_dec_ref(v_bits_21_);
v_res_23_ = lp_algalVerification_Algal_Core_BinaryValue_sign(v_bits_boxed_22_);
v_r_24_ = lean_box(v_res_23_);
return v_r_24_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_coefficient(uint64_t v_bits_25_){
_start:
{
lean_object* v___x_26_; lean_object* v___x_27_; uint8_t v___x_28_; 
v___x_26_ = lp_algalVerification_Algal_Core_Binary64_exponent(v_bits_25_);
v___x_27_ = lean_unsigned_to_nat(0u);
v___x_28_ = lean_nat_dec_eq(v___x_26_, v___x_27_);
lean_dec(v___x_26_);
if (v___x_28_ == 0)
{
lean_object* v___x_29_; lean_object* v___x_30_; lean_object* v___x_31_; 
v___x_29_ = lean_cstr_to_nat("4503599627370496");
v___x_30_ = lp_algalVerification_Algal_Core_BinaryValue_fraction(v_bits_25_);
v___x_31_ = lean_nat_add(v___x_29_, v___x_30_);
lean_dec(v___x_30_);
return v___x_31_;
}
else
{
lean_object* v___x_32_; 
v___x_32_ = lp_algalVerification_Algal_Core_BinaryValue_fraction(v_bits_25_);
return v___x_32_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_coefficient___boxed(lean_object* v_bits_33_){
_start:
{
uint64_t v_bits_boxed_34_; lean_object* v_res_35_; 
v_bits_boxed_34_ = lean_unbox_uint64(v_bits_33_);
lean_dec_ref(v_bits_33_);
v_res_35_ = lp_algalVerification_Algal_Core_BinaryValue_coefficient(v_bits_boxed_34_);
return v_res_35_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_BinaryValue_power___closed__0(void){
_start:
{
lean_object* v___x_36_; lean_object* v___x_37_; 
v___x_36_ = lean_unsigned_to_nat(1075u);
v___x_37_ = lean_nat_to_int(v___x_36_);
return v___x_37_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_BinaryValue_power___closed__1(void){
_start:
{
lean_object* v___x_38_; lean_object* v___x_39_; 
v___x_38_ = lean_unsigned_to_nat(1074u);
v___x_39_ = lean_nat_to_int(v___x_38_);
return v___x_39_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_BinaryValue_power___closed__2(void){
_start:
{
lean_object* v___x_40_; lean_object* v___x_41_; 
v___x_40_ = lean_obj_once(&lp_algalVerification_Algal_Core_BinaryValue_power___closed__1, &lp_algalVerification_Algal_Core_BinaryValue_power___closed__1_once, _init_lp_algalVerification_Algal_Core_BinaryValue_power___closed__1);
v___x_41_ = lean_int_neg(v___x_40_);
return v___x_41_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_power(uint64_t v_bits_42_){
_start:
{
lean_object* v___x_43_; lean_object* v___x_44_; uint8_t v___x_45_; 
v___x_43_ = lp_algalVerification_Algal_Core_Binary64_exponent(v_bits_42_);
v___x_44_ = lean_unsigned_to_nat(0u);
v___x_45_ = lean_nat_dec_eq(v___x_43_, v___x_44_);
if (v___x_45_ == 0)
{
lean_object* v___x_46_; lean_object* v___x_47_; lean_object* v___x_48_; 
v___x_46_ = lean_nat_to_int(v___x_43_);
v___x_47_ = lean_obj_once(&lp_algalVerification_Algal_Core_BinaryValue_power___closed__0, &lp_algalVerification_Algal_Core_BinaryValue_power___closed__0_once, _init_lp_algalVerification_Algal_Core_BinaryValue_power___closed__0);
v___x_48_ = lean_int_sub(v___x_46_, v___x_47_);
lean_dec(v___x_46_);
return v___x_48_;
}
else
{
lean_object* v___x_49_; 
lean_dec(v___x_43_);
v___x_49_ = lean_obj_once(&lp_algalVerification_Algal_Core_BinaryValue_power___closed__2, &lp_algalVerification_Algal_Core_BinaryValue_power___closed__2_once, _init_lp_algalVerification_Algal_Core_BinaryValue_power___closed__2);
return v___x_49_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_power___boxed(lean_object* v_bits_50_){
_start:
{
uint64_t v_bits_boxed_51_; lean_object* v_res_52_; 
v_bits_boxed_51_ = lean_unbox_uint64(v_bits_50_);
lean_dec_ref(v_bits_50_);
v_res_52_ = lp_algalVerification_Algal_Core_BinaryValue_power(v_bits_boxed_51_);
return v_res_52_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_exact(uint64_t v_bits_53_){
_start:
{
uint8_t v___x_54_; lean_object* v___x_55_; lean_object* v___x_56_; lean_object* v___x_57_; lean_object* v___x_58_; lean_object* v___x_59_; lean_object* v___x_60_; 
v___x_54_ = lp_algalVerification_Algal_Core_BinaryValue_sign(v_bits_53_);
v___x_55_ = lp_algalVerification_Algal_Core_BinaryValue_coefficient(v_bits_53_);
v___x_56_ = lean_nat_to_int(v___x_55_);
v___x_57_ = l_Float_Model_UnpackedFloat_Sign_apply(v___x_54_, v___x_56_);
lean_dec(v___x_56_);
v___x_58_ = lp_algalVerification_Algal_Core_BinaryValue_power(v_bits_53_);
v___x_59_ = lean_int_neg(v___x_58_);
lean_dec(v___x_58_);
v___x_60_ = l_Dyadic_ofIntWithPrec(v___x_57_, v___x_59_);
lean_dec(v___x_59_);
return v___x_60_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_exact___boxed(lean_object* v_bits_61_){
_start:
{
uint64_t v_bits_boxed_62_; lean_object* v_res_63_; 
v_bits_boxed_62_ = lean_unbox_uint64(v_bits_61_);
lean_dec_ref(v_bits_61_);
v_res_63_ = lp_algalVerification_Algal_Core_BinaryValue_exact(v_bits_boxed_62_);
return v_res_63_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__0(void){
_start:
{
lean_object* v___x_64_; lean_object* v___x_65_; 
v___x_64_ = lean_unsigned_to_nat(0u);
v___x_65_ = lean_nat_to_int(v___x_64_);
return v___x_65_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__1(void){
_start:
{
lean_object* v___x_66_; lean_object* v___x_67_; 
v___x_66_ = lean_obj_once(&lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__0, &lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__0_once, _init_lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__0);
v___x_67_ = l_Dyadic_ofInt(v___x_66_);
return v___x_67_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__2(void){
_start:
{
lean_object* v___x_68_; lean_object* v___x_69_; 
v___x_68_ = lean_obj_once(&lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__1, &lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__1_once, _init_lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__1);
v___x_69_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_69_, 0, v___x_68_);
return v___x_69_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_unpackedExact(lean_object* v_x_70_){
_start:
{
switch(lean_obj_tag(v_x_70_))
{
case 2:
{
lean_object* v___x_71_; 
lean_dec_ref_known(v_x_70_, 0);
v___x_71_ = lean_obj_once(&lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__2, &lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__2_once, _init_lp_algalVerification_Algal_Core_BinaryValue_unpackedExact___closed__2);
return v___x_71_;
}
case 3:
{
uint8_t v_sign_72_; lean_object* v_mantissa_73_; lean_object* v_exponent_74_; lean_object* v___x_75_; lean_object* v___x_76_; lean_object* v___x_77_; lean_object* v___x_78_; lean_object* v___x_79_; 
v_sign_72_ = lean_ctor_get_uint8(v_x_70_, sizeof(void*)*2);
v_mantissa_73_ = lean_ctor_get(v_x_70_, 0);
lean_inc(v_mantissa_73_);
v_exponent_74_ = lean_ctor_get(v_x_70_, 1);
lean_inc(v_exponent_74_);
lean_dec_ref_known(v_x_70_, 2);
v___x_75_ = lean_nat_to_int(v_mantissa_73_);
v___x_76_ = l_Float_Model_UnpackedFloat_Sign_apply(v_sign_72_, v___x_75_);
lean_dec(v___x_75_);
v___x_77_ = lean_int_neg(v_exponent_74_);
lean_dec(v_exponent_74_);
v___x_78_ = l_Dyadic_ofIntWithPrec(v___x_76_, v___x_77_);
lean_dec(v___x_77_);
v___x_79_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_79_, 0, v___x_78_);
return v___x_79_;
}
default: 
{
lean_object* v___x_80_; 
lean_dec(v_x_70_);
v___x_80_ = lean_box(0);
return v___x_80_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_BinaryValue_0__Algal_Core_BinaryValue_unpackedExact_match__1_splitter___redArg(lean_object* v_x_81_, lean_object* v_h__1_82_, lean_object* v_h__2_83_, lean_object* v_h__3_84_, lean_object* v_h__4_85_){
_start:
{
switch(lean_obj_tag(v_x_81_))
{
case 0:
{
uint8_t v_sign_86_; lean_object* v___x_87_; lean_object* v___x_88_; 
lean_dec(v_h__4_85_);
lean_dec(v_h__2_83_);
lean_dec(v_h__1_82_);
v_sign_86_ = lean_ctor_get_uint8(v_x_81_, 0);
lean_dec_ref_known(v_x_81_, 0);
v___x_87_ = lean_box(v_sign_86_);
v___x_88_ = lean_apply_1(v_h__3_84_, v___x_87_);
return v___x_88_;
}
case 1:
{
lean_object* v___x_89_; lean_object* v___x_90_; 
lean_dec(v_h__3_84_);
lean_dec(v_h__2_83_);
lean_dec(v_h__1_82_);
v___x_89_ = lean_box(0);
v___x_90_ = lean_apply_1(v_h__4_85_, v___x_89_);
return v___x_90_;
}
case 2:
{
uint8_t v_sign_91_; lean_object* v___x_92_; lean_object* v___x_93_; 
lean_dec(v_h__4_85_);
lean_dec(v_h__3_84_);
lean_dec(v_h__2_83_);
v_sign_91_ = lean_ctor_get_uint8(v_x_81_, 0);
lean_dec_ref_known(v_x_81_, 0);
v___x_92_ = lean_box(v_sign_91_);
v___x_93_ = lean_apply_1(v_h__1_82_, v___x_92_);
return v___x_93_;
}
default: 
{
uint8_t v_sign_94_; lean_object* v_mantissa_95_; lean_object* v_exponent_96_; lean_object* v___x_97_; lean_object* v___x_98_; 
lean_dec(v_h__4_85_);
lean_dec(v_h__3_84_);
lean_dec(v_h__1_82_);
v_sign_94_ = lean_ctor_get_uint8(v_x_81_, sizeof(void*)*2);
v_mantissa_95_ = lean_ctor_get(v_x_81_, 0);
lean_inc(v_mantissa_95_);
v_exponent_96_ = lean_ctor_get(v_x_81_, 1);
lean_inc(v_exponent_96_);
lean_dec_ref_known(v_x_81_, 2);
v___x_97_ = lean_box(v_sign_94_);
v___x_98_ = lean_apply_4(v_h__2_83_, v___x_97_, v_mantissa_95_, v_exponent_96_, lean_box(0));
return v___x_98_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_BinaryValue_0__Algal_Core_BinaryValue_unpackedExact_match__1_splitter(lean_object* v_motive_99_, lean_object* v_x_100_, lean_object* v_h__1_101_, lean_object* v_h__2_102_, lean_object* v_h__3_103_, lean_object* v_h__4_104_){
_start:
{
switch(lean_obj_tag(v_x_100_))
{
case 0:
{
uint8_t v_sign_105_; lean_object* v___x_106_; lean_object* v___x_107_; 
lean_dec(v_h__4_104_);
lean_dec(v_h__2_102_);
lean_dec(v_h__1_101_);
v_sign_105_ = lean_ctor_get_uint8(v_x_100_, 0);
lean_dec_ref_known(v_x_100_, 0);
v___x_106_ = lean_box(v_sign_105_);
v___x_107_ = lean_apply_1(v_h__3_103_, v___x_106_);
return v___x_107_;
}
case 1:
{
lean_object* v___x_108_; lean_object* v___x_109_; 
lean_dec(v_h__3_103_);
lean_dec(v_h__2_102_);
lean_dec(v_h__1_101_);
v___x_108_ = lean_box(0);
v___x_109_ = lean_apply_1(v_h__4_104_, v___x_108_);
return v___x_109_;
}
case 2:
{
uint8_t v_sign_110_; lean_object* v___x_111_; lean_object* v___x_112_; 
lean_dec(v_h__4_104_);
lean_dec(v_h__3_103_);
lean_dec(v_h__2_102_);
v_sign_110_ = lean_ctor_get_uint8(v_x_100_, 0);
lean_dec_ref_known(v_x_100_, 0);
v___x_111_ = lean_box(v_sign_110_);
v___x_112_ = lean_apply_1(v_h__1_101_, v___x_111_);
return v___x_112_;
}
default: 
{
uint8_t v_sign_113_; lean_object* v_mantissa_114_; lean_object* v_exponent_115_; lean_object* v___x_116_; lean_object* v___x_117_; 
lean_dec(v_h__4_104_);
lean_dec(v_h__3_103_);
lean_dec(v_h__1_101_);
v_sign_113_ = lean_ctor_get_uint8(v_x_100_, sizeof(void*)*2);
v_mantissa_114_ = lean_ctor_get(v_x_100_, 0);
lean_inc(v_mantissa_114_);
v_exponent_115_ = lean_ctor_get(v_x_100_, 1);
lean_inc(v_exponent_115_);
lean_dec_ref_known(v_x_100_, 2);
v___x_116_ = lean_box(v_sign_113_);
v___x_117_ = lean_apply_4(v_h__2_102_, v___x_116_, v_mantissa_114_, v_exponent_115_, lean_box(0));
return v___x_117_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_BinaryValue_0__Float_Model_UnpackedFloat_Sign_instNeg_match__1_splitter___redArg(uint8_t v_x_118_, lean_object* v_h__1_119_, lean_object* v_h__2_120_){
_start:
{
if (v_x_118_ == 0)
{
lean_object* v___x_121_; lean_object* v___x_122_; 
lean_dec(v_h__2_120_);
v___x_121_ = lean_box(0);
v___x_122_ = lean_apply_1(v_h__1_119_, v___x_121_);
return v___x_122_;
}
else
{
lean_object* v___x_123_; lean_object* v___x_124_; 
lean_dec(v_h__1_119_);
v___x_123_ = lean_box(0);
v___x_124_ = lean_apply_1(v_h__2_120_, v___x_123_);
return v___x_124_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_BinaryValue_0__Float_Model_UnpackedFloat_Sign_instNeg_match__1_splitter___redArg___boxed(lean_object* v_x_125_, lean_object* v_h__1_126_, lean_object* v_h__2_127_){
_start:
{
uint8_t v_x_24__boxed_128_; lean_object* v_res_129_; 
v_x_24__boxed_128_ = lean_unbox(v_x_125_);
v_res_129_ = lp_algalVerification___private_Algal_Core_BinaryValue_0__Float_Model_UnpackedFloat_Sign_instNeg_match__1_splitter___redArg(v_x_24__boxed_128_, v_h__1_126_, v_h__2_127_);
return v_res_129_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_BinaryValue_0__Float_Model_UnpackedFloat_Sign_instNeg_match__1_splitter(lean_object* v_motive_130_, uint8_t v_x_131_, lean_object* v_h__1_132_, lean_object* v_h__2_133_){
_start:
{
if (v_x_131_ == 0)
{
lean_object* v___x_134_; lean_object* v___x_135_; 
lean_dec(v_h__2_133_);
v___x_134_ = lean_box(0);
v___x_135_ = lean_apply_1(v_h__1_132_, v___x_134_);
return v___x_135_;
}
else
{
lean_object* v___x_136_; lean_object* v___x_137_; 
lean_dec(v_h__1_132_);
v___x_136_ = lean_box(0);
v___x_137_ = lean_apply_1(v_h__2_133_, v___x_136_);
return v___x_137_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_BinaryValue_0__Float_Model_UnpackedFloat_Sign_instNeg_match__1_splitter___boxed(lean_object* v_motive_138_, lean_object* v_x_139_, lean_object* v_h__1_140_, lean_object* v_h__2_141_){
_start:
{
uint8_t v_x_35__boxed_142_; lean_object* v_res_143_; 
v_x_35__boxed_142_ = lean_unbox(v_x_139_);
v_res_143_ = lp_algalVerification___private_Algal_Core_BinaryValue_0__Float_Model_UnpackedFloat_Sign_instNeg_match__1_splitter(v_motive_138_, v_x_35__boxed_142_, v_h__1_140_, v_h__2_141_);
return v_res_143_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_denote(uint64_t v_number_144_){
_start:
{
lean_object* v___x_145_; 
v___x_145_ = lp_algalVerification_Algal_Core_BinaryValue_exact(v_number_144_);
return v___x_145_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_BinaryValue_denote___boxed(lean_object* v_number_146_){
_start:
{
uint64_t v_number_boxed_147_; lean_object* v_res_148_; 
v_number_boxed_147_ = lean_unbox_uint64(v_number_146_);
lean_dec_ref(v_number_146_);
v_res_148_ = lp_algalVerification_Algal_Core_BinaryValue_denote(v_number_boxed_147_);
return v_res_148_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Binary64(uint8_t builtin);
lean_object* initialize_Init_Data_Dyadic(uint8_t builtin);
lean_object* initialize_Init_Data_Float_Model_Unpacked_Pack_Lemmas(uint8_t builtin);
lean_object* initialize_Init_Omega(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_BinaryValue(uint8_t builtin) {
lean_object * res;
if (_G_initialized) return lean_io_result_mk_ok(lean_box(0));
_G_initialized = true;
lean_initialize_runtime_module();
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Binary64(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Data_Dyadic(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Data_Float_Model_Unpacked_Pack_Lemmas(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Omega(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
