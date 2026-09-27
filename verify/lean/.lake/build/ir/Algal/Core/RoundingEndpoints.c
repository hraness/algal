// Lean compiler output
// Module: Algal.Core.RoundingEndpoints
// Imports: public import Init public meta import Init public import Algal.Core.SignedRounding public import Init.Data.Float.Model.Unpacked.Round
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
lean_object* lean_nat_to_int(lean_object*);
lean_object* lean_int_neg(lean_object*);
lean_object* l_Dyadic_ofIntWithPrec(lean_object*, lean_object*);
lean_object* l_Dyadic_toRat(lean_object*);
lean_object* lp_algalVerification_Algal_Core_RoundingInterval_value(uint64_t);
lean_object* lp_algalVerification_Algal_Core_RoundingInterval_midpoint(lean_object*, lean_object*);
lean_object* l_Float_Model_UnpackedFloat_round(lean_object*, uint8_t, lean_object*, lean_object*);
lean_object* l_Float_Model_UnpackedFloat_pack(lean_object*, lean_object*);
uint64_t lean_uint64_of_nat(lean_object*);
lean_object* l_Nat_cast___at___00Dyadic_toRat_spec__0(lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingEndpoints_minimumSubnormal;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingEndpoints_afterMinimumSubnormal;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingEndpoints_beforeMaximum;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingEndpoints_maximum;
static lean_once_cell_t lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__0;
static lean_once_cell_t lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__2_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__2;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingEndpoints_zeroFor(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_zeroFor___boxed(lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__0;
static lean_once_cell_t lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__2_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__2;
static lean_once_cell_t lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__3_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__3;
static lean_once_cell_t lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__4_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__4;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext;
static lean_once_cell_t lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary___closed__0;
static lean_once_cell_t lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary___closed__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim___redArg___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_finite_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_finite_elim___redArg___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_finite_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_finite_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_overflow_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_overflow_elim___redArg___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_overflow_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_overflow_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_admitted(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_admitted___boxed(lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_bits(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_bits___boxed(lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Core_RoundingEndpoints_modelRoundedBits___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(52) << 1) | 1)),((lean_object*)(((size_t)(11) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_modelRoundedBits___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_RoundingEndpoints_modelRoundedBits___closed__0_value;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingEndpoints_modelRoundedBits(uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_modelRoundedBits___boxed(lean_object*, lean_object*, lean_object*);
static uint64_t _init_lp_algalVerification_Algal_Core_RoundingEndpoints_minimumSubnormal(void){
_start:
{
uint64_t v___x_1_; 
v___x_1_ = 1ULL;
return v___x_1_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Core_RoundingEndpoints_afterMinimumSubnormal(void){
_start:
{
uint64_t v___x_2_; 
v___x_2_ = 2ULL;
return v___x_2_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Core_RoundingEndpoints_beforeMaximum(void){
_start:
{
uint64_t v___x_3_; 
v___x_3_ = 9218868437227405310ULL;
return v___x_3_;
}
}
static uint64_t _init_lp_algalVerification_Algal_Core_RoundingEndpoints_maximum(void){
_start:
{
uint64_t v___x_4_; 
v___x_4_ = 9218868437227405311ULL;
return v___x_4_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__0(void){
_start:
{
lean_object* v___x_5_; lean_object* v___x_6_; 
v___x_5_ = lean_unsigned_to_nat(0u);
v___x_6_ = l_Nat_cast___at___00Dyadic_toRat_spec__0(v___x_5_);
return v___x_6_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__1(void){
_start:
{
uint64_t v___x_7_; lean_object* v___x_8_; 
v___x_7_ = 1ULL;
v___x_8_ = lp_algalVerification_Algal_Core_RoundingInterval_value(v___x_7_);
return v___x_8_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__2(void){
_start:
{
lean_object* v___x_9_; lean_object* v___x_10_; lean_object* v___x_11_; 
v___x_9_ = lean_obj_once(&lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__1, &lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__1_once, _init_lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__1);
v___x_10_ = lean_obj_once(&lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__0, &lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__0_once, _init_lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__0);
v___x_11_ = lp_algalVerification_Algal_Core_RoundingInterval_midpoint(v___x_10_, v___x_9_);
return v___x_11_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary(void){
_start:
{
lean_object* v___x_12_; 
v___x_12_ = lean_obj_once(&lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__2, &lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__2_once, _init_lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary___closed__2);
return v___x_12_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingEndpoints_zeroFor(uint8_t v_x_13_){
_start:
{
if (v_x_13_ == 0)
{
uint64_t v___x_14_; 
v___x_14_ = 9223372036854775808ULL;
return v___x_14_;
}
else
{
uint64_t v___x_15_; 
v___x_15_ = 0ULL;
return v___x_15_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_zeroFor___boxed(lean_object* v_x_16_){
_start:
{
uint8_t v_x_20__boxed_17_; uint64_t v_res_18_; lean_object* v_r_19_; 
v_x_20__boxed_17_ = lean_unbox(v_x_16_);
v_res_18_ = lp_algalVerification_Algal_Core_RoundingEndpoints_zeroFor(v_x_20__boxed_17_);
v_r_19_ = lean_box_uint64(v_res_18_);
return v_r_19_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__0(void){
_start:
{
lean_object* v___x_20_; lean_object* v___x_21_; 
v___x_20_ = lean_unsigned_to_nat(1u);
v___x_21_ = lean_nat_to_int(v___x_20_);
return v___x_21_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__1(void){
_start:
{
lean_object* v___x_22_; lean_object* v___x_23_; 
v___x_22_ = lean_unsigned_to_nat(1024u);
v___x_23_ = lean_nat_to_int(v___x_22_);
return v___x_23_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__2(void){
_start:
{
lean_object* v___x_24_; lean_object* v___x_25_; 
v___x_24_ = lean_obj_once(&lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__1, &lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__1_once, _init_lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__1);
v___x_25_ = lean_int_neg(v___x_24_);
return v___x_25_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__3(void){
_start:
{
lean_object* v___x_26_; lean_object* v___x_27_; lean_object* v___x_28_; 
v___x_26_ = lean_obj_once(&lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__2, &lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__2_once, _init_lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__2);
v___x_27_ = lean_obj_once(&lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__0, &lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__0_once, _init_lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__0);
v___x_28_ = l_Dyadic_ofIntWithPrec(v___x_27_, v___x_26_);
return v___x_28_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__4(void){
_start:
{
lean_object* v___x_29_; lean_object* v___x_30_; 
v___x_29_ = lean_obj_once(&lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__3, &lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__3_once, _init_lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__3);
v___x_30_ = l_Dyadic_toRat(v___x_29_);
return v___x_30_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext(void){
_start:
{
lean_object* v___x_31_; 
v___x_31_ = lean_obj_once(&lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__4, &lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__4_once, _init_lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext___closed__4);
return v___x_31_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary___closed__0(void){
_start:
{
uint64_t v___x_32_; lean_object* v___x_33_; 
v___x_32_ = 9218868437227405311ULL;
v___x_33_ = lp_algalVerification_Algal_Core_RoundingInterval_value(v___x_32_);
return v___x_33_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary___closed__1(void){
_start:
{
lean_object* v___x_34_; lean_object* v___x_35_; lean_object* v___x_36_; 
v___x_34_ = lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext;
v___x_35_ = lean_obj_once(&lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary___closed__0, &lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary___closed__0_once, _init_lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary___closed__0);
v___x_36_ = lp_algalVerification_Algal_Core_RoundingInterval_midpoint(v___x_35_, v___x_34_);
return v___x_36_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary(void){
_start:
{
lean_object* v___x_37_; 
v___x_37_ = lean_obj_once(&lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary___closed__1, &lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary___closed__1_once, _init_lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary___closed__1);
return v___x_37_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorIdx(lean_object* v_x_38_){
_start:
{
if (lean_obj_tag(v_x_38_) == 0)
{
lean_object* v___x_39_; 
v___x_39_ = lean_unsigned_to_nat(0u);
return v___x_39_;
}
else
{
lean_object* v___x_40_; 
v___x_40_ = lean_unsigned_to_nat(1u);
return v___x_40_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorIdx___boxed(lean_object* v_x_41_){
_start:
{
lean_object* v_res_42_; 
v_res_42_ = lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorIdx(v_x_41_);
lean_dec_ref(v_x_41_);
return v_res_42_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim___redArg(lean_object* v_t_43_, lean_object* v_k_44_){
_start:
{
if (lean_obj_tag(v_t_43_) == 0)
{
uint64_t v_number_45_; lean_object* v___x_46_; lean_object* v___x_47_; 
v_number_45_ = lean_ctor_get_uint64(v_t_43_, 0);
v___x_46_ = lean_box_uint64(v_number_45_);
v___x_47_ = lean_apply_1(v_k_44_, v___x_46_);
return v___x_47_;
}
else
{
uint8_t v_sign_48_; lean_object* v___x_49_; lean_object* v___x_50_; 
v_sign_48_ = lean_ctor_get_uint8(v_t_43_, 0);
v___x_49_ = lean_box(v_sign_48_);
v___x_50_ = lean_apply_1(v_k_44_, v___x_49_);
return v___x_50_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim___redArg___boxed(lean_object* v_t_51_, lean_object* v_k_52_){
_start:
{
lean_object* v_res_53_; 
v_res_53_ = lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim___redArg(v_t_51_, v_k_52_);
lean_dec_ref(v_t_51_);
return v_res_53_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim(lean_object* v_motive_54_, lean_object* v_ctorIdx_55_, lean_object* v_t_56_, lean_object* v_h_57_, lean_object* v_k_58_){
_start:
{
lean_object* v___x_59_; 
v___x_59_ = lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim___redArg(v_t_56_, v_k_58_);
return v___x_59_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim___boxed(lean_object* v_motive_60_, lean_object* v_ctorIdx_61_, lean_object* v_t_62_, lean_object* v_h_63_, lean_object* v_k_64_){
_start:
{
lean_object* v_res_65_; 
v_res_65_ = lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim(v_motive_60_, v_ctorIdx_61_, v_t_62_, v_h_63_, v_k_64_);
lean_dec_ref(v_t_62_);
lean_dec(v_ctorIdx_61_);
return v_res_65_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_finite_elim___redArg(lean_object* v_t_66_, lean_object* v_finite_67_){
_start:
{
lean_object* v___x_68_; 
v___x_68_ = lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim___redArg(v_t_66_, v_finite_67_);
return v___x_68_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_finite_elim___redArg___boxed(lean_object* v_t_69_, lean_object* v_finite_70_){
_start:
{
lean_object* v_res_71_; 
v_res_71_ = lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_finite_elim___redArg(v_t_69_, v_finite_70_);
lean_dec_ref(v_t_69_);
return v_res_71_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_finite_elim(lean_object* v_motive_72_, lean_object* v_t_73_, lean_object* v_h_74_, lean_object* v_finite_75_){
_start:
{
lean_object* v___x_76_; 
v___x_76_ = lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim___redArg(v_t_73_, v_finite_75_);
return v___x_76_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_finite_elim___boxed(lean_object* v_motive_77_, lean_object* v_t_78_, lean_object* v_h_79_, lean_object* v_finite_80_){
_start:
{
lean_object* v_res_81_; 
v_res_81_ = lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_finite_elim(v_motive_77_, v_t_78_, v_h_79_, v_finite_80_);
lean_dec_ref(v_t_78_);
return v_res_81_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_overflow_elim___redArg(lean_object* v_t_82_, lean_object* v_overflow_83_){
_start:
{
lean_object* v___x_84_; 
v___x_84_ = lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim___redArg(v_t_82_, v_overflow_83_);
return v___x_84_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_overflow_elim___redArg___boxed(lean_object* v_t_85_, lean_object* v_overflow_86_){
_start:
{
lean_object* v_res_87_; 
v_res_87_ = lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_overflow_elim___redArg(v_t_85_, v_overflow_86_);
lean_dec_ref(v_t_85_);
return v_res_87_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_overflow_elim(lean_object* v_motive_88_, lean_object* v_t_89_, lean_object* v_h_90_, lean_object* v_overflow_91_){
_start:
{
lean_object* v___x_92_; 
v___x_92_ = lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_ctorElim___redArg(v_t_89_, v_overflow_91_);
return v___x_92_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_overflow_elim___boxed(lean_object* v_motive_93_, lean_object* v_t_94_, lean_object* v_h_95_, lean_object* v_overflow_96_){
_start:
{
lean_object* v_res_97_; 
v_res_97_ = lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_overflow_elim(v_motive_93_, v_t_94_, v_h_95_, v_overflow_96_);
lean_dec_ref(v_t_94_);
return v_res_97_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_admitted(lean_object* v_x_98_){
_start:
{
if (lean_obj_tag(v_x_98_) == 0)
{
uint64_t v_number_99_; lean_object* v___x_100_; lean_object* v___x_101_; 
v_number_99_ = lean_ctor_get_uint64(v_x_98_, 0);
v___x_100_ = lean_box_uint64(v_number_99_);
v___x_101_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_101_, 0, v___x_100_);
return v___x_101_;
}
else
{
lean_object* v___x_102_; 
v___x_102_ = lean_box(0);
return v___x_102_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_admitted___boxed(lean_object* v_x_103_){
_start:
{
lean_object* v_res_104_; 
v_res_104_ = lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_admitted(v_x_103_);
lean_dec_ref(v_x_103_);
return v_res_104_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_bits(lean_object* v_x_105_){
_start:
{
if (lean_obj_tag(v_x_105_) == 0)
{
uint64_t v_number_106_; 
v_number_106_ = lean_ctor_get_uint64(v_x_105_, 0);
return v_number_106_;
}
else
{
uint8_t v_sign_107_; 
v_sign_107_ = lean_ctor_get_uint8(v_x_105_, 0);
if (v_sign_107_ == 0)
{
uint64_t v___x_108_; 
v___x_108_ = 18442240474082181120ULL;
return v___x_108_;
}
else
{
uint64_t v___x_109_; 
v___x_109_ = 9218868437227405312ULL;
return v___x_109_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_bits___boxed(lean_object* v_x_110_){
_start:
{
uint64_t v_res_111_; lean_object* v_r_112_; 
v_res_111_ = lp_algalVerification_Algal_Core_RoundingEndpoints_BoundaryResult_bits(v_x_110_);
lean_dec_ref(v_x_110_);
v_r_112_ = lean_box_uint64(v_res_111_);
return v_r_112_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_RoundingEndpoints_modelRoundedBits(uint8_t v_s_116_, lean_object* v_mantissa_117_, lean_object* v_exponent_118_){
_start:
{
lean_object* v___x_119_; lean_object* v___x_120_; lean_object* v___x_121_; uint64_t v___x_122_; 
v___x_119_ = ((lean_object*)(lp_algalVerification_Algal_Core_RoundingEndpoints_modelRoundedBits___closed__0));
v___x_120_ = l_Float_Model_UnpackedFloat_round(v___x_119_, v_s_116_, v_mantissa_117_, v_exponent_118_);
v___x_121_ = l_Float_Model_UnpackedFloat_pack(v___x_119_, v___x_120_);
lean_dec(v___x_120_);
v___x_122_ = lean_uint64_of_nat(v___x_121_);
lean_dec(v___x_121_);
return v___x_122_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_RoundingEndpoints_modelRoundedBits___boxed(lean_object* v_s_123_, lean_object* v_mantissa_124_, lean_object* v_exponent_125_){
_start:
{
uint8_t v_s_boxed_126_; uint64_t v_res_127_; lean_object* v_r_128_; 
v_s_boxed_126_ = lean_unbox(v_s_123_);
v_res_127_ = lp_algalVerification_Algal_Core_RoundingEndpoints_modelRoundedBits(v_s_boxed_126_, v_mantissa_124_, v_exponent_125_);
lean_dec(v_exponent_125_);
lean_dec(v_mantissa_124_);
v_r_128_ = lean_box_uint64(v_res_127_);
return v_r_128_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_SignedRounding(uint8_t builtin);
lean_object* initialize_Init_Data_Float_Model_Unpacked_Round(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_RoundingEndpoints(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Core_SignedRounding(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Data_Float_Model_Unpacked_Round(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification_Algal_Core_RoundingEndpoints_minimumSubnormal = _init_lp_algalVerification_Algal_Core_RoundingEndpoints_minimumSubnormal();
lp_algalVerification_Algal_Core_RoundingEndpoints_afterMinimumSubnormal = _init_lp_algalVerification_Algal_Core_RoundingEndpoints_afterMinimumSubnormal();
lp_algalVerification_Algal_Core_RoundingEndpoints_beforeMaximum = _init_lp_algalVerification_Algal_Core_RoundingEndpoints_beforeMaximum();
lp_algalVerification_Algal_Core_RoundingEndpoints_maximum = _init_lp_algalVerification_Algal_Core_RoundingEndpoints_maximum();
lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary = _init_lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary();
lean_mark_persistent(lp_algalVerification_Algal_Core_RoundingEndpoints_underflowBoundary);
lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext = _init_lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext();
lean_mark_persistent(lp_algalVerification_Algal_Core_RoundingEndpoints_virtualNext);
lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary = _init_lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary();
lean_mark_persistent(lp_algalVerification_Algal_Core_RoundingEndpoints_overflowBoundary);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
