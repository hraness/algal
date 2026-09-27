// Lean compiler output
// Module: Algal.Core.RoundingInterval
// Imports: public import Init public meta import Init public import Algal.Core.NumericInjectivity public import Init.Grind public import Init.Grind.Ordered.Rat
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
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Core_BinaryValue_signBit(uint64_t);
lean_object* lp_algalVerification_Algal_Core_BinaryValue_exact(uint64_t);
lean_object* l_Dyadic_toRat(lean_object*);
lean_object* l_Rat_add(lean_object*, lean_object*);
lean_object* l_Nat_cast___at___00Dyadic_toRat_spec__0(lean_object*);
lean_object* l_Rat_div(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingInterval_value(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingInterval_value___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_RoundingInterval_instDecidableNonnegative___aux__1(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingInterval_instDecidableNonnegative___aux__1___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_RoundingInterval_instDecidableNonnegative(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingInterval_instDecidableNonnegative___boxed(lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Core_RoundingInterval_midpoint___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_RoundingInterval_midpoint___closed__0;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingInterval_midpoint(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_RoundingInterval_instDecidableEven___aux__1(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingInterval_instDecidableEven___aux__1___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_RoundingInterval_instDecidableEven(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingInterval_instDecidableEven___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RoundingInterval_0__Float_Model_UnpackedFloat_Accuracy_roundToNearestEven_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RoundingInterval_0__Float_Model_UnpackedFloat_Accuracy_roundToNearestEven_match__1_splitter___redArg___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RoundingInterval_0__Float_Model_UnpackedFloat_Accuracy_roundToNearestEven_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RoundingInterval_0__Float_Model_UnpackedFloat_Accuracy_roundToNearestEven_match__1_splitter___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingInterval_beforeOne;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingInterval_one;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingInterval_afterOne;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingInterval_afterAfterOne;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingInterval_maximumSubnormal;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingInterval_minimumNormal;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingInterval_afterMinimumNormal;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingInterval_value(uint64_t v_n_1_){
_start:
{
lean_object* v___x_2_; lean_object* v___x_3_; 
v___x_2_ = lp_algalVerification_Algal_Core_BinaryValue_exact(v_n_1_);
v___x_3_ = l_Dyadic_toRat(v___x_2_);
return v___x_3_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingInterval_value___boxed(lean_object* v_n_4_){
_start:
{
uint64_t v_n_boxed_5_; lean_object* v_res_6_; 
v_n_boxed_5_ = lean_unbox_uint64(v_n_4_);
lean_dec_ref(v_n_4_);
v_res_6_ = lp_algalVerification_Algal_Core_RoundingInterval_value(v_n_boxed_5_);
return v_res_6_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_RoundingInterval_instDecidableNonnegative___aux__1(uint64_t v_n_7_){
_start:
{
lean_object* v___x_8_; lean_object* v___x_9_; uint8_t v___x_10_; 
v___x_8_ = lp_algalVerification_Algal_Core_BinaryValue_signBit(v_n_7_);
v___x_9_ = lean_unsigned_to_nat(0u);
v___x_10_ = lean_nat_dec_eq(v___x_8_, v___x_9_);
lean_dec(v___x_8_);
return v___x_10_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingInterval_instDecidableNonnegative___aux__1___boxed(lean_object* v_n_11_){
_start:
{
uint64_t v_n_boxed_12_; uint8_t v_res_13_; lean_object* v_r_14_; 
v_n_boxed_12_ = lean_unbox_uint64(v_n_11_);
lean_dec_ref(v_n_11_);
v_res_13_ = lp_algalVerification_Algal_Core_RoundingInterval_instDecidableNonnegative___aux__1(v_n_boxed_12_);
v_r_14_ = lean_box(v_res_13_);
return v_r_14_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_RoundingInterval_instDecidableNonnegative(uint64_t v_n_15_){
_start:
{
uint8_t v___x_16_; 
v___x_16_ = lp_algalVerification_Algal_Core_RoundingInterval_instDecidableNonnegative___aux__1(v_n_15_);
return v___x_16_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingInterval_instDecidableNonnegative___boxed(lean_object* v_n_17_){
_start:
{
uint64_t v_n_boxed_18_; uint8_t v_res_19_; lean_object* v_r_20_; 
v_n_boxed_18_ = lean_unbox_uint64(v_n_17_);
lean_dec_ref(v_n_17_);
v_res_19_ = lp_algalVerification_Algal_Core_RoundingInterval_instDecidableNonnegative(v_n_boxed_18_);
v_r_20_ = lean_box(v_res_19_);
return v_r_20_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_RoundingInterval_midpoint___closed__0(void){
_start:
{
lean_object* v___x_21_; lean_object* v___x_22_; 
v___x_21_ = lean_unsigned_to_nat(2u);
v___x_22_ = l_Nat_cast___at___00Dyadic_toRat_spec__0(v___x_21_);
return v___x_22_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingInterval_midpoint(lean_object* v_a_23_, lean_object* v_b_24_){
_start:
{
lean_object* v___x_25_; lean_object* v___x_26_; lean_object* v___x_27_; 
v___x_25_ = l_Rat_add(v_a_23_, v_b_24_);
v___x_26_ = lean_obj_once(&lp_algalVerification_Algal_Core_RoundingInterval_midpoint___closed__0, &lp_algalVerification_Algal_Core_RoundingInterval_midpoint___closed__0_once, _init_lp_algalVerification_Algal_Core_RoundingInterval_midpoint___closed__0);
v___x_27_ = l_Rat_div(v___x_25_, v___x_26_);
lean_dec_ref(v___x_25_);
return v___x_27_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_RoundingInterval_instDecidableEven___aux__1(uint64_t v_n_28_){
_start:
{
lean_object* v___x_29_; lean_object* v___x_30_; lean_object* v___x_31_; lean_object* v___x_32_; uint8_t v___x_33_; 
v___x_29_ = lean_uint64_to_nat(v_n_28_);
v___x_30_ = lean_unsigned_to_nat(2u);
v___x_31_ = lean_nat_mod(v___x_29_, v___x_30_);
lean_dec(v___x_29_);
v___x_32_ = lean_unsigned_to_nat(0u);
v___x_33_ = lean_nat_dec_eq(v___x_31_, v___x_32_);
lean_dec(v___x_31_);
return v___x_33_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingInterval_instDecidableEven___aux__1___boxed(lean_object* v_n_34_){
_start:
{
uint64_t v_n_boxed_35_; uint8_t v_res_36_; lean_object* v_r_37_; 
v_n_boxed_35_ = lean_unbox_uint64(v_n_34_);
lean_dec_ref(v_n_34_);
v_res_36_ = lp_algalVerification_Algal_Core_RoundingInterval_instDecidableEven___aux__1(v_n_boxed_35_);
v_r_37_ = lean_box(v_res_36_);
return v_r_37_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_RoundingInterval_instDecidableEven(uint64_t v_n_38_){
_start:
{
uint8_t v___x_39_; 
v___x_39_ = lp_algalVerification_Algal_Core_RoundingInterval_instDecidableEven___aux__1(v_n_38_);
return v___x_39_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingInterval_instDecidableEven___boxed(lean_object* v_n_40_){
_start:
{
uint64_t v_n_boxed_41_; uint8_t v_res_42_; lean_object* v_r_43_; 
v_n_boxed_41_ = lean_unbox_uint64(v_n_40_);
lean_dec_ref(v_n_40_);
v_res_42_ = lp_algalVerification_Algal_Core_RoundingInterval_instDecidableEven(v_n_boxed_41_);
v_r_43_ = lean_box(v_res_42_);
return v_r_43_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RoundingInterval_0__Float_Model_UnpackedFloat_Accuracy_roundToNearestEven_match__1_splitter___redArg(lean_object* v_x_44_, lean_object* v_h__1_45_, lean_object* v_h__2_46_, lean_object* v_h__3_47_, lean_object* v_h__4_48_){
_start:
{
if (lean_obj_tag(v_x_44_) == 0)
{
lean_object* v___x_49_; lean_object* v___x_50_; 
lean_dec(v_h__4_48_);
lean_dec(v_h__3_47_);
lean_dec(v_h__2_46_);
v___x_49_ = lean_box(0);
v___x_50_ = lean_apply_1(v_h__1_45_, v___x_49_);
return v___x_50_;
}
else
{
uint8_t v_relativeToPlusOneHalfUlp_51_; 
lean_dec(v_h__1_45_);
v_relativeToPlusOneHalfUlp_51_ = lean_ctor_get_uint8(v_x_44_, 0);
switch(v_relativeToPlusOneHalfUlp_51_)
{
case 0:
{
lean_object* v___x_52_; lean_object* v___x_53_; 
lean_dec(v_h__4_48_);
lean_dec(v_h__3_47_);
v___x_52_ = lean_box(0);
v___x_53_ = lean_apply_1(v_h__2_46_, v___x_52_);
return v___x_53_;
}
case 1:
{
lean_object* v___x_54_; lean_object* v___x_55_; 
lean_dec(v_h__4_48_);
lean_dec(v_h__2_46_);
v___x_54_ = lean_box(0);
v___x_55_ = lean_apply_1(v_h__3_47_, v___x_54_);
return v___x_55_;
}
default: 
{
lean_object* v___x_56_; lean_object* v___x_57_; 
lean_dec(v_h__3_47_);
lean_dec(v_h__2_46_);
v___x_56_ = lean_box(0);
v___x_57_ = lean_apply_1(v_h__4_48_, v___x_56_);
return v___x_57_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RoundingInterval_0__Float_Model_UnpackedFloat_Accuracy_roundToNearestEven_match__1_splitter___redArg___boxed(lean_object* v_x_58_, lean_object* v_h__1_59_, lean_object* v_h__2_60_, lean_object* v_h__3_61_, lean_object* v_h__4_62_){
_start:
{
lean_object* v_res_63_; 
v_res_63_ = lp_algalVerification___private_Algal_Core_RoundingInterval_0__Float_Model_UnpackedFloat_Accuracy_roundToNearestEven_match__1_splitter___redArg(v_x_58_, v_h__1_59_, v_h__2_60_, v_h__3_61_, v_h__4_62_);
lean_dec(v_x_58_);
return v_res_63_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RoundingInterval_0__Float_Model_UnpackedFloat_Accuracy_roundToNearestEven_match__1_splitter(lean_object* v_motive_64_, lean_object* v_x_65_, lean_object* v_h__1_66_, lean_object* v_h__2_67_, lean_object* v_h__3_68_, lean_object* v_h__4_69_){
_start:
{
if (lean_obj_tag(v_x_65_) == 0)
{
lean_object* v___x_70_; lean_object* v___x_71_; 
lean_dec(v_h__4_69_);
lean_dec(v_h__3_68_);
lean_dec(v_h__2_67_);
v___x_70_ = lean_box(0);
v___x_71_ = lean_apply_1(v_h__1_66_, v___x_70_);
return v___x_71_;
}
else
{
uint8_t v_relativeToPlusOneHalfUlp_72_; 
lean_dec(v_h__1_66_);
v_relativeToPlusOneHalfUlp_72_ = lean_ctor_get_uint8(v_x_65_, 0);
switch(v_relativeToPlusOneHalfUlp_72_)
{
case 0:
{
lean_object* v___x_73_; lean_object* v___x_74_; 
lean_dec(v_h__4_69_);
lean_dec(v_h__3_68_);
v___x_73_ = lean_box(0);
v___x_74_ = lean_apply_1(v_h__2_67_, v___x_73_);
return v___x_74_;
}
case 1:
{
lean_object* v___x_75_; lean_object* v___x_76_; 
lean_dec(v_h__4_69_);
lean_dec(v_h__2_67_);
v___x_75_ = lean_box(0);
v___x_76_ = lean_apply_1(v_h__3_68_, v___x_75_);
return v___x_76_;
}
default: 
{
lean_object* v___x_77_; lean_object* v___x_78_; 
lean_dec(v_h__3_68_);
lean_dec(v_h__2_67_);
v___x_77_ = lean_box(0);
v___x_78_ = lean_apply_1(v_h__4_69_, v___x_77_);
return v___x_78_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_RoundingInterval_0__Float_Model_UnpackedFloat_Accuracy_roundToNearestEven_match__1_splitter___boxed(lean_object* v_motive_79_, lean_object* v_x_80_, lean_object* v_h__1_81_, lean_object* v_h__2_82_, lean_object* v_h__3_83_, lean_object* v_h__4_84_){
_start:
{
lean_object* v_res_85_; 
v_res_85_ = lp_algalVerification___private_Algal_Core_RoundingInterval_0__Float_Model_UnpackedFloat_Accuracy_roundToNearestEven_match__1_splitter(v_motive_79_, v_x_80_, v_h__1_81_, v_h__2_82_, v_h__3_83_, v_h__4_84_);
lean_dec(v_x_80_);
return v_res_85_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Core_RoundingInterval_beforeOne(void){
_start:
{
uint64_t v___x_86_; 
v___x_86_ = 4607182418800017407ULL;
return v___x_86_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Core_RoundingInterval_one(void){
_start:
{
uint64_t v___x_87_; 
v___x_87_ = 4607182418800017408ULL;
return v___x_87_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Core_RoundingInterval_afterOne(void){
_start:
{
uint64_t v___x_88_; 
v___x_88_ = 4607182418800017409ULL;
return v___x_88_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Core_RoundingInterval_afterAfterOne(void){
_start:
{
uint64_t v___x_89_; 
v___x_89_ = 4607182418800017410ULL;
return v___x_89_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Core_RoundingInterval_maximumSubnormal(void){
_start:
{
uint64_t v___x_90_; 
v___x_90_ = 4503599627370495ULL;
return v___x_90_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Core_RoundingInterval_minimumNormal(void){
_start:
{
uint64_t v___x_91_; 
v___x_91_ = 4503599627370496ULL;
return v___x_91_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Core_RoundingInterval_afterMinimumNormal(void){
_start:
{
uint64_t v___x_92_; 
v___x_92_ = 4503599627370497ULL;
return v___x_92_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_NumericInjectivity(uint8_t builtin);
lean_object* initialize_Init_Grind(uint8_t builtin);
lean_object* initialize_Init_Grind_Ordered_Rat(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_RoundingInterval(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Core_NumericInjectivity(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Grind(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Grind_Ordered_Rat(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification_Algal_Core_RoundingInterval_beforeOne = _init_lp_algalVerification_Algal_Core_RoundingInterval_beforeOne();
lp_algalVerification_Algal_Core_RoundingInterval_one = _init_lp_algalVerification_Algal_Core_RoundingInterval_one();
lp_algalVerification_Algal_Core_RoundingInterval_afterOne = _init_lp_algalVerification_Algal_Core_RoundingInterval_afterOne();
lp_algalVerification_Algal_Core_RoundingInterval_afterAfterOne = _init_lp_algalVerification_Algal_Core_RoundingInterval_afterAfterOne();
lp_algalVerification_Algal_Core_RoundingInterval_maximumSubnormal = _init_lp_algalVerification_Algal_Core_RoundingInterval_maximumSubnormal();
lp_algalVerification_Algal_Core_RoundingInterval_minimumNormal = _init_lp_algalVerification_Algal_Core_RoundingInterval_minimumNormal();
lp_algalVerification_Algal_Core_RoundingInterval_afterMinimumNormal = _init_lp_algalVerification_Algal_Core_RoundingInterval_afterMinimumNormal();
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
