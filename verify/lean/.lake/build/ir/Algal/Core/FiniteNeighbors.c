// Lean compiler output
// Module: Algal.Core.FiniteNeighbors
// Imports: public import Init public meta import Init public import Algal.Core.NegativeEndpoints
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
lean_object* lean_nat_sub(lean_object*, lean_object*);
uint64_t lean_uint64_of_nat(lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* lean_nat_add(lean_object*, lean_object*);
uint8_t lp_algalVerification_Algal_Core_RoundingInterval_instDecidableNonnegative___aux__1(uint64_t);
uint64_t lp_algalVerification_Algal_Core_SignedRounding_negateBits(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_maxCode;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_FiniteNeighbors_fromCode___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_fromCode___redArg___boxed(lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_FiniteNeighbors_fromCode(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_fromCode___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_FiniteNeighbors_previous___redArg(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_previous___redArg___boxed(lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_FiniteNeighbors_previous(uint64_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_previous___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_FiniteNeighbors_next___redArg(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_next___redArg___boxed(lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_FiniteNeighbors_next(uint64_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_next___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorIdx___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorIdx___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorIdx(uint64_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorIdx___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim___redArg___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim(uint64_t, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_zero_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_zero_elim___redArg___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_zero_elim(uint64_t, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_zero_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_maximum_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_maximum_elim___redArg___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_maximum_elim(uint64_t, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_maximum_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_interior_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_interior_elim___redArg___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_interior_elim(uint64_t, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_interior_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_positiveView___redArg(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_positiveView___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_positiveView(uint64_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_positiveView___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorIdx___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorIdx___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorIdx(uint64_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorIdx___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorElim(uint64_t, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_nonnegative_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_nonnegative_elim(uint64_t, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_nonnegative_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_negative_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_negative_elim(uint64_t, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_negative_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_signedView(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_signedView___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_neighborCodes(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_neighborCodes___boxed(lean_object*);
static lean_object* _init_lp_algalVerification_Algal_Core_FiniteNeighbors_maxCode(void){
_start:
{
lean_object* v___x_1_; 
v___x_1_ = lean_cstr_to_nat("9218868437227405311");
return v___x_1_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_FiniteNeighbors_fromCode___redArg(lean_object* v_code_2_){
_start:
{
uint64_t v___x_3_; 
v___x_3_ = lean_uint64_of_nat(v_code_2_);
return v___x_3_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_fromCode___redArg___boxed(lean_object* v_code_4_){
_start:
{
uint64_t v_res_5_; lean_object* v_r_6_; 
v_res_5_ = lp_algalVerification_Algal_Core_FiniteNeighbors_fromCode___redArg(v_code_4_);
lean_dec(v_code_4_);
v_r_6_ = lean_box_uint64(v_res_5_);
return v_r_6_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_FiniteNeighbors_fromCode(lean_object* v_code_7_, lean_object* v_bound_8_){
_start:
{
uint64_t v___x_9_; 
v___x_9_ = lean_uint64_of_nat(v_code_7_);
return v___x_9_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_fromCode___boxed(lean_object* v_code_10_, lean_object* v_bound_11_){
_start:
{
uint64_t v_res_12_; lean_object* v_r_13_; 
v_res_12_ = lp_algalVerification_Algal_Core_FiniteNeighbors_fromCode(v_code_10_, v_bound_11_);
lean_dec(v_code_10_);
v_r_13_ = lean_box_uint64(v_res_12_);
return v_r_13_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_FiniteNeighbors_previous___redArg(uint64_t v_n_14_){
_start:
{
lean_object* v___x_15_; lean_object* v___x_16_; lean_object* v___x_17_; uint64_t v___x_18_; 
v___x_15_ = lean_uint64_to_nat(v_n_14_);
v___x_16_ = lean_unsigned_to_nat(1u);
v___x_17_ = lean_nat_sub(v___x_15_, v___x_16_);
lean_dec(v___x_15_);
v___x_18_ = lean_uint64_of_nat(v___x_17_);
lean_dec(v___x_17_);
return v___x_18_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_previous___redArg___boxed(lean_object* v_n_19_){
_start:
{
uint64_t v_n_boxed_20_; uint64_t v_res_21_; lean_object* v_r_22_; 
v_n_boxed_20_ = lean_unbox_uint64(v_n_19_);
lean_dec_ref(v_n_19_);
v_res_21_ = lp_algalVerification_Algal_Core_FiniteNeighbors_previous___redArg(v_n_boxed_20_);
v_r_22_ = lean_box_uint64(v_res_21_);
return v_r_22_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_FiniteNeighbors_previous(uint64_t v_n_23_, lean_object* v_sign_24_){
_start:
{
uint64_t v___x_25_; 
v___x_25_ = lp_algalVerification_Algal_Core_FiniteNeighbors_previous___redArg(v_n_23_);
return v___x_25_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_previous___boxed(lean_object* v_n_26_, lean_object* v_sign_27_){
_start:
{
uint64_t v_n_boxed_28_; uint64_t v_res_29_; lean_object* v_r_30_; 
v_n_boxed_28_ = lean_unbox_uint64(v_n_26_);
lean_dec_ref(v_n_26_);
v_res_29_ = lp_algalVerification_Algal_Core_FiniteNeighbors_previous(v_n_boxed_28_, v_sign_27_);
v_r_30_ = lean_box_uint64(v_res_29_);
return v_r_30_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_FiniteNeighbors_next___redArg(uint64_t v_n_31_){
_start:
{
lean_object* v___x_32_; lean_object* v___x_33_; lean_object* v___x_34_; uint64_t v___x_35_; 
v___x_32_ = lean_uint64_to_nat(v_n_31_);
v___x_33_ = lean_unsigned_to_nat(1u);
v___x_34_ = lean_nat_add(v___x_32_, v___x_33_);
lean_dec(v___x_32_);
v___x_35_ = lean_uint64_of_nat(v___x_34_);
lean_dec(v___x_34_);
return v___x_35_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_next___redArg___boxed(lean_object* v_n_36_){
_start:
{
uint64_t v_n_boxed_37_; uint64_t v_res_38_; lean_object* v_r_39_; 
v_n_boxed_37_ = lean_unbox_uint64(v_n_36_);
lean_dec_ref(v_n_36_);
v_res_38_ = lp_algalVerification_Algal_Core_FiniteNeighbors_next___redArg(v_n_boxed_37_);
v_r_39_ = lean_box_uint64(v_res_38_);
return v_r_39_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_FiniteNeighbors_next(uint64_t v_n_40_, lean_object* v_below_41_){
_start:
{
uint64_t v___x_42_; 
v___x_42_ = lp_algalVerification_Algal_Core_FiniteNeighbors_next___redArg(v_n_40_);
return v___x_42_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_next___boxed(lean_object* v_n_43_, lean_object* v_below_44_){
_start:
{
uint64_t v_n_boxed_45_; uint64_t v_res_46_; lean_object* v_r_47_; 
v_n_boxed_45_ = lean_unbox_uint64(v_n_43_);
lean_dec_ref(v_n_43_);
v_res_46_ = lp_algalVerification_Algal_Core_FiniteNeighbors_next(v_n_boxed_45_, v_below_44_);
v_r_47_ = lean_box_uint64(v_res_46_);
return v_r_47_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorIdx___redArg(lean_object* v_x_48_){
_start:
{
switch(lean_obj_tag(v_x_48_))
{
case 0:
{
lean_object* v___x_49_; 
v___x_49_ = lean_unsigned_to_nat(0u);
return v___x_49_;
}
case 1:
{
lean_object* v___x_50_; 
v___x_50_ = lean_unsigned_to_nat(1u);
return v___x_50_;
}
default: 
{
lean_object* v___x_51_; 
v___x_51_ = lean_unsigned_to_nat(2u);
return v___x_51_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorIdx___redArg___boxed(lean_object* v_x_52_){
_start:
{
lean_object* v_res_53_; 
v_res_53_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorIdx___redArg(v_x_52_);
lean_dec(v_x_52_);
return v_res_53_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorIdx(uint64_t v_n_54_, lean_object* v_x_55_){
_start:
{
lean_object* v___x_56_; 
v___x_56_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorIdx___redArg(v_x_55_);
return v___x_56_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorIdx___boxed(lean_object* v_n_57_, lean_object* v_x_58_){
_start:
{
uint64_t v_n_boxed_59_; lean_object* v_res_60_; 
v_n_boxed_59_ = lean_unbox_uint64(v_n_57_);
lean_dec_ref(v_n_57_);
v_res_60_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorIdx(v_n_boxed_59_, v_x_58_);
lean_dec(v_x_58_);
return v_res_60_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim___redArg(lean_object* v_t_61_, lean_object* v_k_62_){
_start:
{
if (lean_obj_tag(v_t_61_) == 2)
{
uint64_t v_previous_63_; uint64_t v_next_64_; lean_object* v___x_65_; lean_object* v___x_66_; lean_object* v___x_67_; 
v_previous_63_ = lean_ctor_get_uint64(v_t_61_, 0);
v_next_64_ = lean_ctor_get_uint64(v_t_61_, 8);
v___x_65_ = lean_box_uint64(v_previous_63_);
v___x_66_ = lean_box_uint64(v_next_64_);
v___x_67_ = lean_apply_4(v_k_62_, v___x_65_, v___x_66_, lean_box(0), lean_box(0));
return v___x_67_;
}
else
{
lean_object* v___x_68_; 
v___x_68_ = lean_apply_1(v_k_62_, lean_box(0));
return v___x_68_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim___redArg___boxed(lean_object* v_t_69_, lean_object* v_k_70_){
_start:
{
lean_object* v_res_71_; 
v_res_71_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim___redArg(v_t_69_, v_k_70_);
lean_dec(v_t_69_);
return v_res_71_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim(uint64_t v_n_72_, lean_object* v_motive_73_, lean_object* v_ctorIdx_74_, lean_object* v_t_75_, lean_object* v_h_76_, lean_object* v_k_77_){
_start:
{
lean_object* v___x_78_; 
v___x_78_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim___redArg(v_t_75_, v_k_77_);
return v___x_78_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim___boxed(lean_object* v_n_79_, lean_object* v_motive_80_, lean_object* v_ctorIdx_81_, lean_object* v_t_82_, lean_object* v_h_83_, lean_object* v_k_84_){
_start:
{
uint64_t v_n_boxed_85_; lean_object* v_res_86_; 
v_n_boxed_85_ = lean_unbox_uint64(v_n_79_);
lean_dec_ref(v_n_79_);
v_res_86_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim(v_n_boxed_85_, v_motive_80_, v_ctorIdx_81_, v_t_82_, v_h_83_, v_k_84_);
lean_dec(v_t_82_);
lean_dec(v_ctorIdx_81_);
return v_res_86_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_zero_elim___redArg(lean_object* v_t_87_, lean_object* v_zero_88_){
_start:
{
lean_object* v___x_89_; 
v___x_89_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim___redArg(v_t_87_, v_zero_88_);
return v___x_89_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_zero_elim___redArg___boxed(lean_object* v_t_90_, lean_object* v_zero_91_){
_start:
{
lean_object* v_res_92_; 
v_res_92_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_zero_elim___redArg(v_t_90_, v_zero_91_);
lean_dec(v_t_90_);
return v_res_92_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_zero_elim(uint64_t v_n_93_, lean_object* v_motive_94_, lean_object* v_t_95_, lean_object* v_h_96_, lean_object* v_zero_97_){
_start:
{
lean_object* v___x_98_; 
v___x_98_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim___redArg(v_t_95_, v_zero_97_);
return v___x_98_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_zero_elim___boxed(lean_object* v_n_99_, lean_object* v_motive_100_, lean_object* v_t_101_, lean_object* v_h_102_, lean_object* v_zero_103_){
_start:
{
uint64_t v_n_boxed_104_; lean_object* v_res_105_; 
v_n_boxed_104_ = lean_unbox_uint64(v_n_99_);
lean_dec_ref(v_n_99_);
v_res_105_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_zero_elim(v_n_boxed_104_, v_motive_100_, v_t_101_, v_h_102_, v_zero_103_);
lean_dec(v_t_101_);
return v_res_105_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_maximum_elim___redArg(lean_object* v_t_106_, lean_object* v_maximum_107_){
_start:
{
lean_object* v___x_108_; 
v___x_108_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim___redArg(v_t_106_, v_maximum_107_);
return v___x_108_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_maximum_elim___redArg___boxed(lean_object* v_t_109_, lean_object* v_maximum_110_){
_start:
{
lean_object* v_res_111_; 
v_res_111_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_maximum_elim___redArg(v_t_109_, v_maximum_110_);
lean_dec(v_t_109_);
return v_res_111_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_maximum_elim(uint64_t v_n_112_, lean_object* v_motive_113_, lean_object* v_t_114_, lean_object* v_h_115_, lean_object* v_maximum_116_){
_start:
{
lean_object* v___x_117_; 
v___x_117_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim___redArg(v_t_114_, v_maximum_116_);
return v___x_117_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_maximum_elim___boxed(lean_object* v_n_118_, lean_object* v_motive_119_, lean_object* v_t_120_, lean_object* v_h_121_, lean_object* v_maximum_122_){
_start:
{
uint64_t v_n_boxed_123_; lean_object* v_res_124_; 
v_n_boxed_123_ = lean_unbox_uint64(v_n_118_);
lean_dec_ref(v_n_118_);
v_res_124_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_maximum_elim(v_n_boxed_123_, v_motive_119_, v_t_120_, v_h_121_, v_maximum_122_);
lean_dec(v_t_120_);
return v_res_124_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_interior_elim___redArg(lean_object* v_t_125_, lean_object* v_interior_126_){
_start:
{
lean_object* v___x_127_; 
v___x_127_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim___redArg(v_t_125_, v_interior_126_);
return v___x_127_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_interior_elim___redArg___boxed(lean_object* v_t_128_, lean_object* v_interior_129_){
_start:
{
lean_object* v_res_130_; 
v_res_130_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_interior_elim___redArg(v_t_128_, v_interior_129_);
lean_dec(v_t_128_);
return v_res_130_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_interior_elim(uint64_t v_n_131_, lean_object* v_motive_132_, lean_object* v_t_133_, lean_object* v_h_134_, lean_object* v_interior_135_){
_start:
{
lean_object* v___x_136_; 
v___x_136_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_ctorElim___redArg(v_t_133_, v_interior_135_);
return v___x_136_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_interior_elim___boxed(lean_object* v_n_137_, lean_object* v_motive_138_, lean_object* v_t_139_, lean_object* v_h_140_, lean_object* v_interior_141_){
_start:
{
uint64_t v_n_boxed_142_; lean_object* v_res_143_; 
v_n_boxed_142_ = lean_unbox_uint64(v_n_137_);
lean_dec_ref(v_n_137_);
v_res_143_ = lp_algalVerification_Algal_Core_FiniteNeighbors_PositiveView_interior_elim(v_n_boxed_142_, v_motive_138_, v_t_139_, v_h_140_, v_interior_141_);
lean_dec(v_t_139_);
return v_res_143_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_positiveView___redArg(uint64_t v_n_144_){
_start:
{
lean_object* v___x_145_; lean_object* v___x_146_; uint8_t v___x_147_; 
v___x_145_ = lean_uint64_to_nat(v_n_144_);
v___x_146_ = lean_unsigned_to_nat(0u);
v___x_147_ = lean_nat_dec_eq(v___x_145_, v___x_146_);
if (v___x_147_ == 0)
{
lean_object* v___x_148_; uint8_t v___x_149_; 
v___x_148_ = lean_cstr_to_nat("9218868437227405311");
v___x_149_ = lean_nat_dec_eq(v___x_145_, v___x_148_);
lean_dec(v___x_145_);
if (v___x_149_ == 0)
{
uint64_t v___x_150_; uint64_t v___x_151_; lean_object* v___x_152_; 
v___x_150_ = lp_algalVerification_Algal_Core_FiniteNeighbors_previous___redArg(v_n_144_);
v___x_151_ = lp_algalVerification_Algal_Core_FiniteNeighbors_next___redArg(v_n_144_);
v___x_152_ = lean_alloc_ctor(2, 0, 16);
lean_ctor_set_uint64(v___x_152_, 0, v___x_150_);
lean_ctor_set_uint64(v___x_152_, 8, v___x_151_);
return v___x_152_;
}
else
{
lean_object* v___x_153_; 
v___x_153_ = lean_box(1);
return v___x_153_;
}
}
else
{
lean_object* v___x_154_; 
lean_dec(v___x_145_);
v___x_154_ = lean_box(0);
return v___x_154_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_positiveView___redArg___boxed(lean_object* v_n_155_){
_start:
{
uint64_t v_n_boxed_156_; lean_object* v_res_157_; 
v_n_boxed_156_ = lean_unbox_uint64(v_n_155_);
lean_dec_ref(v_n_155_);
v_res_157_ = lp_algalVerification_Algal_Core_FiniteNeighbors_positiveView___redArg(v_n_boxed_156_);
return v_res_157_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_positiveView(uint64_t v_n_158_, lean_object* v_sign_159_){
_start:
{
lean_object* v___x_160_; 
v___x_160_ = lp_algalVerification_Algal_Core_FiniteNeighbors_positiveView___redArg(v_n_158_);
return v___x_160_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_positiveView___boxed(lean_object* v_n_161_, lean_object* v_sign_162_){
_start:
{
uint64_t v_n_boxed_163_; lean_object* v_res_164_; 
v_n_boxed_163_ = lean_unbox_uint64(v_n_161_);
lean_dec_ref(v_n_161_);
v_res_164_ = lp_algalVerification_Algal_Core_FiniteNeighbors_positiveView(v_n_boxed_163_, v_sign_162_);
return v_res_164_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorIdx___redArg(lean_object* v_x_165_){
_start:
{
if (lean_obj_tag(v_x_165_) == 0)
{
lean_object* v___x_166_; 
v___x_166_ = lean_unsigned_to_nat(0u);
return v___x_166_;
}
else
{
lean_object* v___x_167_; 
v___x_167_ = lean_unsigned_to_nat(1u);
return v___x_167_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorIdx___redArg___boxed(lean_object* v_x_168_){
_start:
{
lean_object* v_res_169_; 
v_res_169_ = lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorIdx___redArg(v_x_168_);
lean_dec_ref(v_x_168_);
return v_res_169_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorIdx(uint64_t v_n_170_, lean_object* v_x_171_){
_start:
{
lean_object* v___x_172_; 
v___x_172_ = lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorIdx___redArg(v_x_171_);
return v___x_172_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorIdx___boxed(lean_object* v_n_173_, lean_object* v_x_174_){
_start:
{
uint64_t v_n_boxed_175_; lean_object* v_res_176_; 
v_n_boxed_175_ = lean_unbox_uint64(v_n_173_);
lean_dec_ref(v_n_173_);
v_res_176_ = lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorIdx(v_n_boxed_175_, v_x_174_);
lean_dec_ref(v_x_174_);
return v_res_176_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorElim___redArg(lean_object* v_t_177_, lean_object* v_k_178_){
_start:
{
lean_object* v_a_179_; lean_object* v___x_180_; 
v_a_179_ = lean_ctor_get(v_t_177_, 0);
lean_inc(v_a_179_);
lean_dec_ref(v_t_177_);
v___x_180_ = lean_apply_2(v_k_178_, lean_box(0), v_a_179_);
return v___x_180_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorElim(uint64_t v_n_181_, lean_object* v_motive_182_, lean_object* v_ctorIdx_183_, lean_object* v_t_184_, lean_object* v_h_185_, lean_object* v_k_186_){
_start:
{
lean_object* v___x_187_; 
v___x_187_ = lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorElim___redArg(v_t_184_, v_k_186_);
return v___x_187_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorElim___boxed(lean_object* v_n_188_, lean_object* v_motive_189_, lean_object* v_ctorIdx_190_, lean_object* v_t_191_, lean_object* v_h_192_, lean_object* v_k_193_){
_start:
{
uint64_t v_n_boxed_194_; lean_object* v_res_195_; 
v_n_boxed_194_ = lean_unbox_uint64(v_n_188_);
lean_dec_ref(v_n_188_);
v_res_195_ = lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorElim(v_n_boxed_194_, v_motive_189_, v_ctorIdx_190_, v_t_191_, v_h_192_, v_k_193_);
lean_dec(v_ctorIdx_190_);
return v_res_195_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_nonnegative_elim___redArg(lean_object* v_t_196_, lean_object* v_nonnegative_197_){
_start:
{
lean_object* v___x_198_; 
v___x_198_ = lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorElim___redArg(v_t_196_, v_nonnegative_197_);
return v___x_198_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_nonnegative_elim(uint64_t v_n_199_, lean_object* v_motive_200_, lean_object* v_t_201_, lean_object* v_h_202_, lean_object* v_nonnegative_203_){
_start:
{
lean_object* v___x_204_; 
v___x_204_ = lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorElim___redArg(v_t_201_, v_nonnegative_203_);
return v___x_204_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_nonnegative_elim___boxed(lean_object* v_n_205_, lean_object* v_motive_206_, lean_object* v_t_207_, lean_object* v_h_208_, lean_object* v_nonnegative_209_){
_start:
{
uint64_t v_n_boxed_210_; lean_object* v_res_211_; 
v_n_boxed_210_ = lean_unbox_uint64(v_n_205_);
lean_dec_ref(v_n_205_);
v_res_211_ = lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_nonnegative_elim(v_n_boxed_210_, v_motive_206_, v_t_207_, v_h_208_, v_nonnegative_209_);
return v_res_211_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_negative_elim___redArg(lean_object* v_t_212_, lean_object* v_negative_213_){
_start:
{
lean_object* v___x_214_; 
v___x_214_ = lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorElim___redArg(v_t_212_, v_negative_213_);
return v___x_214_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_negative_elim(uint64_t v_n_215_, lean_object* v_motive_216_, lean_object* v_t_217_, lean_object* v_h_218_, lean_object* v_negative_219_){
_start:
{
lean_object* v___x_220_; 
v___x_220_ = lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_ctorElim___redArg(v_t_217_, v_negative_219_);
return v___x_220_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_negative_elim___boxed(lean_object* v_n_221_, lean_object* v_motive_222_, lean_object* v_t_223_, lean_object* v_h_224_, lean_object* v_negative_225_){
_start:
{
uint64_t v_n_boxed_226_; lean_object* v_res_227_; 
v_n_boxed_226_ = lean_unbox_uint64(v_n_221_);
lean_dec_ref(v_n_221_);
v_res_227_ = lp_algalVerification_Algal_Core_FiniteNeighbors_SignedView_negative_elim(v_n_boxed_226_, v_motive_222_, v_t_223_, v_h_224_, v_negative_225_);
return v_res_227_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_signedView(uint64_t v_n_228_){
_start:
{
uint8_t v___x_229_; 
v___x_229_ = lp_algalVerification_Algal_Core_RoundingInterval_instDecidableNonnegative___aux__1(v_n_228_);
if (v___x_229_ == 0)
{
uint64_t v___x_230_; lean_object* v___x_231_; lean_object* v___x_232_; 
v___x_230_ = lp_algalVerification_Algal_Core_SignedRounding_negateBits(v_n_228_);
v___x_231_ = lp_algalVerification_Algal_Core_FiniteNeighbors_positiveView___redArg(v___x_230_);
v___x_232_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_232_, 0, v___x_231_);
return v___x_232_;
}
else
{
lean_object* v___x_233_; lean_object* v___x_234_; 
v___x_233_ = lp_algalVerification_Algal_Core_FiniteNeighbors_positiveView___redArg(v_n_228_);
v___x_234_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_234_, 0, v___x_233_);
return v___x_234_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_signedView___boxed(lean_object* v_n_235_){
_start:
{
uint64_t v_n_boxed_236_; lean_object* v_res_237_; 
v_n_boxed_236_ = lean_unbox_uint64(v_n_235_);
lean_dec_ref(v_n_235_);
v_res_237_ = lp_algalVerification_Algal_Core_FiniteNeighbors_signedView(v_n_boxed_236_);
return v_res_237_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_neighborCodes(uint64_t v_n_238_){
_start:
{
lean_object* v___x_239_; 
v___x_239_ = lp_algalVerification_Algal_Core_FiniteNeighbors_signedView(v_n_238_);
if (lean_obj_tag(v___x_239_) == 0)
{
lean_object* v_a_240_; lean_object* v___x_242_; uint8_t v_isShared_243_; uint8_t v_isSharedCheck_253_; 
v_a_240_ = lean_ctor_get(v___x_239_, 0);
v_isSharedCheck_253_ = !lean_is_exclusive(v___x_239_);
if (v_isSharedCheck_253_ == 0)
{
v___x_242_ = v___x_239_;
v_isShared_243_ = v_isSharedCheck_253_;
goto v_resetjp_241_;
}
else
{
lean_inc(v_a_240_);
lean_dec(v___x_239_);
v___x_242_ = lean_box(0);
v_isShared_243_ = v_isSharedCheck_253_;
goto v_resetjp_241_;
}
v_resetjp_241_:
{
if (lean_obj_tag(v_a_240_) == 2)
{
uint64_t v_previous_244_; uint64_t v_next_245_; lean_object* v___x_246_; lean_object* v___x_247_; lean_object* v___x_248_; lean_object* v___x_250_; 
v_previous_244_ = lean_ctor_get_uint64(v_a_240_, 0);
v_next_245_ = lean_ctor_get_uint64(v_a_240_, 8);
lean_dec_ref_known(v_a_240_, 0);
v___x_246_ = lean_uint64_to_nat(v_previous_244_);
v___x_247_ = lean_uint64_to_nat(v_next_245_);
v___x_248_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_248_, 0, v___x_246_);
lean_ctor_set(v___x_248_, 1, v___x_247_);
if (v_isShared_243_ == 0)
{
lean_ctor_set_tag(v___x_242_, 1);
lean_ctor_set(v___x_242_, 0, v___x_248_);
v___x_250_ = v___x_242_;
goto v_reusejp_249_;
}
else
{
lean_object* v_reuseFailAlloc_251_; 
v_reuseFailAlloc_251_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_251_, 0, v___x_248_);
v___x_250_ = v_reuseFailAlloc_251_;
goto v_reusejp_249_;
}
v_reusejp_249_:
{
return v___x_250_;
}
}
else
{
lean_object* v___x_252_; 
lean_del_object(v___x_242_);
lean_dec(v_a_240_);
v___x_252_ = lean_box(0);
return v___x_252_;
}
}
}
else
{
lean_object* v_a_254_; lean_object* v___x_256_; uint8_t v_isShared_257_; uint8_t v_isSharedCheck_269_; 
v_a_254_ = lean_ctor_get(v___x_239_, 0);
v_isSharedCheck_269_ = !lean_is_exclusive(v___x_239_);
if (v_isSharedCheck_269_ == 0)
{
v___x_256_ = v___x_239_;
v_isShared_257_ = v_isSharedCheck_269_;
goto v_resetjp_255_;
}
else
{
lean_inc(v_a_254_);
lean_dec(v___x_239_);
v___x_256_ = lean_box(0);
v_isShared_257_ = v_isSharedCheck_269_;
goto v_resetjp_255_;
}
v_resetjp_255_:
{
if (lean_obj_tag(v_a_254_) == 2)
{
uint64_t v_previous_258_; uint64_t v_next_259_; uint64_t v___x_260_; lean_object* v___x_261_; uint64_t v___x_262_; lean_object* v___x_263_; lean_object* v___x_264_; lean_object* v___x_266_; 
v_previous_258_ = lean_ctor_get_uint64(v_a_254_, 0);
v_next_259_ = lean_ctor_get_uint64(v_a_254_, 8);
lean_dec_ref_known(v_a_254_, 0);
v___x_260_ = lp_algalVerification_Algal_Core_SignedRounding_negateBits(v_next_259_);
v___x_261_ = lean_uint64_to_nat(v___x_260_);
v___x_262_ = lp_algalVerification_Algal_Core_SignedRounding_negateBits(v_previous_258_);
v___x_263_ = lean_uint64_to_nat(v___x_262_);
v___x_264_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_264_, 0, v___x_261_);
lean_ctor_set(v___x_264_, 1, v___x_263_);
if (v_isShared_257_ == 0)
{
lean_ctor_set(v___x_256_, 0, v___x_264_);
v___x_266_ = v___x_256_;
goto v_reusejp_265_;
}
else
{
lean_object* v_reuseFailAlloc_267_; 
v_reuseFailAlloc_267_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_267_, 0, v___x_264_);
v___x_266_ = v_reuseFailAlloc_267_;
goto v_reusejp_265_;
}
v_reusejp_265_:
{
return v___x_266_;
}
}
else
{
lean_object* v___x_268_; 
lean_del_object(v___x_256_);
lean_dec(v_a_254_);
v___x_268_ = lean_box(0);
return v___x_268_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_FiniteNeighbors_neighborCodes___boxed(lean_object* v_n_270_){
_start:
{
uint64_t v_n_boxed_271_; lean_object* v_res_272_; 
v_n_boxed_271_ = lean_unbox_uint64(v_n_270_);
lean_dec_ref(v_n_270_);
v_res_272_ = lp_algalVerification_Algal_Core_FiniteNeighbors_neighborCodes(v_n_boxed_271_);
return v_res_272_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_NegativeEndpoints(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_FiniteNeighbors(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Core_NegativeEndpoints(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification_Algal_Core_FiniteNeighbors_maxCode = _init_lp_algalVerification_Algal_Core_FiniteNeighbors_maxCode();
lean_mark_persistent(lp_algalVerification_Algal_Core_FiniteNeighbors_maxCode);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
